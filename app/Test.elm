module Test exposing (..)

import Button
import Config exposing (Config)
import Html exposing (Html, button, div, h3, h4, img, text)
import Html.Attributes exposing (class, src)
import Html.Events exposing (onClick)
import Json.Decode as Decode exposing (Decoder, field, list, string)


type Status
    = Running
    | Failure
    | Approved
    | Rejected
    | Success
    | New


type alias Test =
    { url : String
    , status : Status
    , slug : String
    }


decoder : Decoder Test
decoder =
    let
        statusDecoder : String -> Decoder Status
        statusDecoder raw =
            case raw of
                "running" ->
                    Decode.succeed Running

                "failure" ->
                    Decode.succeed Failure

                "success" ->
                    Decode.succeed Success

                "new" ->
                    Decode.succeed New

                "approved" ->
                    Decode.succeed Approved

                "rejected" ->
                    Decode.succeed Rejected

                anythingElse ->
                    Decode.fail <| anythingElse ++ " is not a valid status"
    in
    Decode.map3 Test
        (field "url" string)
        (field "status" string |> Decode.andThen statusDecoder)
        (field "slug" string)


view : Bool -> Config -> (String -> msg) -> (String -> msg) -> Test -> Html msg
view displayStatus config approveChange rejectChange test =
    let
        filePath folder =
            "file://" ++ config.root ++ "/pupille/" ++ folder ++ "/" ++ test.slug ++ ".png"

        statusToHeader =
            case test.status of
                Running ->
                    "Running"

                Failure ->
                    "Failure"

                Approved ->
                    "Approved"

                Rejected ->
                    "Rejected"

                Success ->
                    "Success"

                New ->
                    "New"

        statusToActions =
            case test.status of
                Failure ->
                    [ Button.default (rejectChange test.slug) "Reject"
                    , Button.default (approveChange test.slug) "Approve"
                    ]

                Approved ->
                    [ Button.default (rejectChange test.slug) "Reject"
                    ]

                Rejected ->
                    [ Button.default (approveChange test.slug) "Approve"
                    ]

                _ ->
                    []

        statusToContent =
            case test.status of
                Running ->
                    []

                Failure ->
                    [ img [ class "original", src <| filePath "original" ] []
                    , div [ class "changes" ]
                        [ img [ class "difference", src <| filePath "results" ] []
                        , img [ class "new", src <| filePath "new" ] []
                        ]
                    ]

                Rejected ->
                    [ img [ class "original", src <| filePath "original" ] []
                    , div [ class "changes" ]
                        [ img [ class "difference", src <| filePath "results" ] []
                        , img [ class "new", src <| filePath "new" ] []
                        ]
                    ]

                Approved ->
                    [ img [ class "original", src <| filePath "original" ] []
                    , div [ class "changes" ]
                        [ img [ class "difference", src <| filePath "results" ] []
                        , img [ class "new", src <| filePath "new" ] []
                        ]
                    ]

                Success ->
                    [ img [ class "original", src <| filePath "original" ] []
                    , img [ class "new", src <| filePath "new" ] []
                    ]

                New ->
                    [ div [] []
                    , img [ class "new", src <| filePath "new" ] []
                    ]
    in
    div [ class "test" ]
        [ h3 [] [ text test.url ]
        , if displayStatus then
            h4 [] [ text statusToHeader ]

          else
            text ""
        , div [ class "image-comparison" ] statusToContent
        , div [ class "test-actions" ] statusToActions
        ]
